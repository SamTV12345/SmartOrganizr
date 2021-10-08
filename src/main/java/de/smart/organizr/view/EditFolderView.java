package de.smart.organizr.view;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;

public class EditFolderView {
	private final  FolderService folderService;
	private String description;
	private String name;

	public EditFolderView(final FolderService folderService) {
		this.folderService = folderService;
	}

	public String saveFolder(){
		System.out.println(description);
		System.out.println(name);
		final Folder folderToBeSaved = new FolderHibernateImpl(name, description);
		System.out.println(folderToBeSaved);
		System.out.println(folderService.saveFolder(folderToBeSaved));
		return "/viewFoldersView.xhtml";
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(final String description) {
		this.description = description;
	}

	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}
}
