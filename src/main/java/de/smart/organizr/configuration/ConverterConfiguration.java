package de.smart.organizr.configuration;

import de.smart.organizr.view.converters.AuthorConverter;
import de.smart.organizr.view.converters.FolderConverter;

/**
 * The ConverterConfiguration manages every necessary converter for the application
 */
public class ConverterConfiguration {
	private AuthorConverter authorConverter;
	private FolderConverter folderConverter;

	public ConverterConfiguration(final AuthorConverter authorConverter, final FolderConverter folderConverter) {
		setAuthorConverter(authorConverter);
		setFolderConverter(folderConverter);
	}

	public AuthorConverter getAuthorConverter() {
		return authorConverter;
	}

	public void setAuthorConverter(final AuthorConverter authorConverter) {
		this.authorConverter = authorConverter;
	}

	public FolderConverter getFolderConverter() {
		return folderConverter;
	}

	public void setFolderConverter(final FolderConverter folderConverter) {
		this.folderConverter = folderConverter;
	}
}
