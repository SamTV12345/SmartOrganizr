package de.smart.organizr.controllers;

import de.smart.organizr.dto.AuthorPatchDto;
import de.smart.organizr.dto.AuthorRepresentationModel;
import de.smart.organizr.dto.AuthorResourceAssembler;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.NoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Optional;


@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/authors")
public class AuthorController {
	private final AuthorService authorService;
	private final NoteService noteService;
	private final AuthorResourceAssembler authorResourceAssembler;

	@GetMapping("")
	public ResponseEntity<PagedModel<AuthorRepresentationModel>> getAuthors(@RequestParam final int page,
	                                                                        @RequestParam(value = "name",
			                                                                        required = false) final Optional<String> name,
	                                                                        final PagedResourcesAssembler<Author> authorPagedResourcesAssembler){
		final Pageable pageable = PageRequest.of(page,50, Sort.by("name").ascending());
		final Page<Author> authors = authorService.findAllAuthorsByUser(getUser(), name, pageable);
		final PagedModel<AuthorRepresentationModel> pagedModel = authorPagedResourcesAssembler.toModel(authors, authorResourceAssembler);
		return ResponseEntity.ok(pagedModel);
	}

	@GetMapping("/{authorId}/notes")
	public ResponseEntity<List<Note>> getNotes(@PathVariable int authorId){
		final List<Note> notesOfAuthor = noteService.findAllNotesByAuthor(authorId, getUser());
		return ResponseEntity.ok(notesOfAuthor);
	}

	@PatchMapping("/{authorId}")
	public ResponseEntity<Author> updateAuthor(@RequestBody AuthorPatchDto authorPatchDto, @PathVariable int authorId){
		return ResponseEntity.ok(authorService.updateAuthor(authorPatchDto, authorId, getUser()));
	}

	@DeleteMapping("/{authorId}")
	public ResponseEntity<Void> deleteAuthor(@PathVariable int authorId) {
		authorService.deleteAuthor(authorId, getUser());
		return ResponseEntity.ok().build();
	}

	@PostMapping("")
	public ResponseEntity<Author> createAuthor(@RequestBody AuthorPatchDto authorPatchDto){
		return ResponseEntity.ok(authorService.createAuthor(authorPatchDto, getUser()));
	}

		private String getUser() {
		return SecurityContextHolder.getContext().getAuthentication().getName();
	}
}
