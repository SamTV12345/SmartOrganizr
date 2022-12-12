package de.smart.organizr.controllers;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.services.interfaces.ConcertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Set;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/concerts")
public class ConcertController {

	private final ConcertService concertService;
	@GetMapping("")
	public ResponseEntity<Set<ConcertDto>> getConcertsOfUser(){
		return ResponseEntity.ok(concertService.getConcertsOfUser(getUser()));
	}

	private String getUser() {
		return SecurityContextHolder.getContext().getAuthentication().getName();
	}

}
