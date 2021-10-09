package de.smart.organizr.configuration;

import de.smart.organizr.view.converters.AuthorConverter;

public class ConverterConfiguration {
	private AuthorConverter authorConverter;

	public ConverterConfiguration(final AuthorConverter authorConverter) {
		setAuthorConverter(authorConverter);
	}

	public AuthorConverter getAuthorConverter() {
		return authorConverter;
	}

	public void setAuthorConverter(final AuthorConverter authorConverter) {
		this.authorConverter = authorConverter;
	}
}
