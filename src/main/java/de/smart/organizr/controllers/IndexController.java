package de.smart.organizr.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.hateoas.Link;
import org.springframework.hateoas.RepresentationModel;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/public")
public class IndexController {

	@GetMapping("")
	public ResponseEntity<RepresentationModel<IndexRepresentationModel>> getIndexLinks(){
		final RepresentationModel<IndexRepresentationModel> representationModel = new RepresentationModel<>();
		representationModel.add(linkTo(methodOn(AuthorController.class).getAuthors(0,null))
				.withRel("author"));
		return ResponseEntity.ok(representationModel);
	}
}
