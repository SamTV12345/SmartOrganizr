package de.smart.organizr.controllers;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.services.interfaces.ConcertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.Set;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/concerts")
public class ConcertController {

	private final ConcertService concertService;
	@GetMapping("")
	public ResponseEntity<List<ConcertDto>> getConcertsOfUser(){
		return ResponseEntity.ok(concertService.getConcertsOfUserSortedByDate(getUser()));
	}

	@PostMapping("")
	public ResponseEntity<ConcertDto> createConcert(@Valid @RequestBody ConcertPostDto concertPostDto){
		return ResponseEntity.ok(concertService.createConcertForUser(concertPostDto,  getUser()));
	}

	@PutMapping("/{concertId}")
	public ResponseEntity<ConcertDto> updateConcert(@RequestBody ConcertPatchDto concertDto,
	                                                @PathVariable String concertId){
		return ResponseEntity.ok(concertService.updateConcert(concertDto,concertId, getUser()));
	}

	@PutMapping("/{concertId}/notes")
	public ResponseEntity<Void> addNoteToConcert(@PathVariable String concertId,
	                                                   @RequestBody List<Integer> noteIdsToAdd){
		concertService.addNotesToConcert(concertId, noteIdsToAdd, getUser());

		return ResponseEntity
				.status(200)
				.build();
	}

	@DeleteMapping("/{concertId}")
	public ResponseEntity<Void> removeConcert(@PathVariable String concertId){
		concertService.removeConcert(concertId, getUser());
		return ResponseEntity
				.noContent()
				.build();
	}


	@DeleteMapping("/{concertId}/{noteId}")
	public ResponseEntity<Void> deleteNoteFromConcert(@PathVariable String concertId,
	                                             @PathVariable int noteId){
		concertService.removeNoteFromConcert(concertId, noteId, getUser());

		return ResponseEntity
				.noContent()
				.build();
	}

	private String getUser() {
		return SecurityContextHolder.getContext().getAuthentication().getName();
	}

}
