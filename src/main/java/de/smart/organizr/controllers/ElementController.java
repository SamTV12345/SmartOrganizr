package de.smart.organizr.controllers;

import de.smart.organizr.dto.FolderDtoMapper;
import de.smart.organizr.dto.FolderRepresentationalModel;
import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.NoPermissionException;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.Link;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Collection;
import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/elements")
public class ElementController {
	private final FolderService folderService;
	private final UserService userService;
	private final FolderDtoMapper folderDtoMapper;


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

	@GetMapping("/{folderId}/children")
	public ResponseEntity<Collection<Object>> findNextChildren(@PathVariable int folderId) {
		final User user = getUser();
		Collection<Element> children = folderService.findChildren(user.getUserId(), folderId);

		return ResponseEntity.ok(addChildrenLinkIfFolder(children));
	}

	public List<Object> addChildrenLinkIfFolder(final Collection<? extends Element> elements) {
		return elements.stream()
		               .map(element -> {
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
		               }).toList();
	}

	private User getUser() {
		final String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return userService.findUserByUserName(username).orElseThrow(() -> new NoPermissionException(username));
	}
}
