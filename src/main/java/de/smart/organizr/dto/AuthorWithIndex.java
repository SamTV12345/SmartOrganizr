package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class AuthorWithIndex extends AuthorHibernateImpl {
	int index;
}
