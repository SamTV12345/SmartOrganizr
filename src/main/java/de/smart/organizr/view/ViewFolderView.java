package de.smart.organizr.view;

import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;

import java.util.Collection;

public class ViewFolderView {
	private final FolderService folderService;

	public ViewFolderView(final FolderService folderService){

		this.folderService = folderService;
	}

	public Collection<Folder> findAllFolders(){
		return folderService.findAllFolders();
	}

	public String navigateToEditFolder(){
		return "/editFolder";
	}
}
