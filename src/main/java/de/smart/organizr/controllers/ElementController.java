package de.smart.organizr.controllers;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.NoPermissionException;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.UserService;
import de.smart.organizr.view.ElementsTreeView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import java.util.Collection;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/elements")
public class ElementController {
	private final FolderService folderService;
	private final NoteService noteService;
	private final UserService userService;


	@Operation(summary = "Returns the top level decks", description = "", tags = { "Element" })
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200",
					description = "If the customer could be found",
					content = @Content(mediaType = "application/json",
							schema = @Schema(implementation = Folder.class)))
		})
	@GetMapping("/parentDecks")
	public ResponseEntity<Collection<Folder>> findAllTopDecks()
			throws NoPermissionException {
		final User user = getUser();
		return ResponseEntity.ok(folderService.findAllParentFolders(user.getUserId()));
	}

	private User getUser() {
		final String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return userService.findUserByUserName(username).orElseThrow(()->new NoPermissionException(username));
	}
}
