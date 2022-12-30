package de.smart.organizr.controllers;

import de.smart.organizr.dto.ElementRepresentationModel;
import de.smart.organizr.dto.ElementResourceAssembler;
import de.smart.organizr.dto.FolderDtoMapper;
import de.smart.organizr.dto.FolderPatchDto;
import de.smart.organizr.dto.FolderPostDto;
import de.smart.organizr.dto.FolderRepresentationalModel;
import de.smart.organizr.dto.NotePatchDto;
import de.smart.organizr.dto.NotePostDto;
import de.smart.organizr.dto.NoteRepresentationModel;
import de.smart.organizr.dto.NoteResourceAssembler;
import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.NoPermissionException;
import de.smart.organizr.repositories.NoteInConcertRepository;
import de.smart.organizr.services.implementations.PDFService;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.UserService;
import de.smart.organizr.utils.BarCodeUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.bouncycastle.util.encoders.Base64Encoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.Link;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/elements")
public class ElementController {
	private final FolderService folderService;
	private final NoteService noteService;
	private final UserService userService;
	private final ElementResourceAssembler elementResourceAssembler;
	private final NoteResourceAssembler noteResourceAssembler;
	private final FolderDtoMapper folderDtoMapper;
	private final PDFService pdfService;

	@Operation(summary = "Returns the top level decks", description = "", tags = {"Element"})
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200",
					description = "If the customer could be found",
					content = @Content(mediaType = "application/json",
							schema = @Schema(implementation = Folder.class)))
	})
	@GetMapping("/parentDecks")
	public ResponseEntity<Collection<Object>> findAllTopDecks()
			throws NoPermissionException {
		final User user = getUser();
		return ResponseEntity.ok(addChildrenLinkIfFolder(folderService.findAllParentFolders(user.getUserId())));
	}

	@PostMapping("/folders")
	public ResponseEntity<Object> createFolder(@RequestBody final FolderPostDto folderPostDto){
		return ResponseEntity.ok(addChildLinkIfFolder(folderService.saveFolderForUser(folderPostDto,
				getUser().getUserId())));
	}

	@PostMapping("/notes")
	public ResponseEntity<Note> createNote(@RequestBody final NotePostDto notePostDto){
			return ResponseEntity.ok(noteService.saveNoteForUser(notePostDto,getUser().getUserId()));
	}

	@GetMapping("/{noteId}/parent")
	public ResponseEntity<Integer> getParentOfNote(@PathVariable int noteId){
		return ResponseEntity.ok(noteService.getParentOfNote(noteId, getUser().getUserId()));
	}

	@GetMapping("/folders")
	public ResponseEntity<PagedModel<ElementRepresentationModel>> searchFolders(@RequestParam final int page,
	                                                        @RequestParam(required = false) final String folderName,
	                                                        final PagedResourcesAssembler<Folder> folderPagedResourcesAssembler){
		final Pageable pageable = PageRequest.of(page,50, Sort.by("name").ascending());
		final Page<Folder> matchingFolders =  folderService.findAllFoldersWithName(folderName, getUser(), pageable);
		return ResponseEntity.ok(folderPagedResourcesAssembler.toModel(matchingFolders,elementResourceAssembler));
	}

	@GetMapping("/notes")
	public ResponseEntity<PagedModel<NoteRepresentationModel>> searchNotes(@RequestParam final int page,
	                                                                       @RequestParam(required = false) final String noteName,
	                                                                       final PagedResourcesAssembler<Note> notePagedResourcesAssembler){
		final Pageable pageable = PageRequest.of(page,50, Sort.by("title").ascending());
		final Page<Note> matchingNotes =  noteService.findAllNotesByName(noteName, getUser(), pageable);
		return ResponseEntity.ok(notePagedResourcesAssembler.toModel(matchingNotes,noteResourceAssembler));
	}

	@GetMapping("/{folderId}/children")
	public ResponseEntity<Collection<Object>> findNextChildren(@PathVariable int folderId) {
		final User user = getUser();
		Collection<Element> children = folderService.findChildren(user.getUserId(), folderId);

		return ResponseEntity.ok(addChildrenLinkIfFolder(children));
	}

	@PatchMapping("/{from}/{to}")
	public ResponseEntity<Void> moveElement(@PathVariable int from, @PathVariable int to){
		folderService.moveElementToFolder(from,to, getUser().getUserId());
		return ResponseEntity.ok().build();
	}

	public List<Object> addChildrenLinkIfFolder(final Collection<? extends Element> elements) {
		return elements.stream()
		               .map(this::addChildLinkIfFolder).toList();
	}

	private Object addChildLinkIfFolder(final Element element) {
		if (element instanceof FolderHibernateImpl folder) {
			final FolderRepresentationalModel folderRepresentationalModel =
					folderDtoMapper.convertFolderToRep(folder);

			final Link link = linkTo(methodOn(ElementController.class).findNextChildren(
					folderRepresentationalModel.getId()))
					.withRel("children");
			folderRepresentationalModel.add(link);
			return folderRepresentationalModel;
		}
		return element;
	}

	@DeleteMapping("/{elementId}")
	public ResponseEntity<Void> deleteElement(@PathVariable int elementId){
			folderService.deleteElementByIdAndUser(elementId, getUser().getUserId());
			return ResponseEntity.ok()
			                     .build();
	}

	@PatchMapping("/notes")
	public ResponseEntity<Note> updateNote(@RequestBody NotePatchDto note){
		return ResponseEntity.ok(noteService.updateNote(note, getUser()));
	}

	@PatchMapping("/folders")
	public ResponseEntity<Folder> updateFolders(@RequestBody FolderPatchDto folderPatchDto){
		return ResponseEntity.ok(folderService.updateFolder(folderPatchDto, getUser()));
	}

	private User getUser() {
		final String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return userService.findUserByUserName(username).orElseThrow(() -> new NoPermissionException(username));
	}

	@GetMapping("/{folderId}/export")
	public ResponseEntity<String> createPDF(@PathVariable int folderId) {
		return ResponseEntity.ok(pdfService.generatePDFOfElement(folderId,
				SecurityContextHolder.getContext().getAuthentication().getName()));
	}
}
