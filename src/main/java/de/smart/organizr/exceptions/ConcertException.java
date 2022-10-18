package de.smart.organizr.exceptions;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.io.Serial;

@RequiredArgsConstructor
@Getter
public class ConcertException extends RuntimeException{
	private final String message;

	@Serial
	private static final long serialVersionUID = -7590966719010101008L;

}
