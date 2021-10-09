package de.smart.organizr.view;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.JsfUtils;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class ViewFolderView {
	private final FolderService folderService;
	private Optional<Folder> currentFolder;

	public ViewFolderView(final FolderService folderService){
		currentFolder = Optional.empty();
		this.folderService = folderService;
	}

	public Collection<? extends Element> findAllFolders(){
		if(currentFolder.isPresent()){
			final Folder folder = currentFolder.get();
			return folder.getElements();
		}
		return folderService.findAllParentFolders();
	}

	/**
	 * Returns if we are currently in a subfolder. That means the parent
	 * of the current displayed deck is present.
	 * @return
	 */
	public boolean isSubfolder(){
		return currentFolder.isPresent();
	}

	public String navigateToEditFolder(){
		currentFolder.ifPresent(JsfUtils::putFolderIntoFlash);
		return "/editFolder";
	}

	public void navigateToNextFolder(final Folder folder){
		currentFolder = Optional.of(folder);
	}

	public Optional<Folder> getCurrentFolder() {
		return currentFolder;
	}

	public void navigateToParent(){
		currentFolder = Optional.ofNullable(currentFolder.get().getParent());
	}

	/**
	 * Returns the navigation string for editing a note
	 * @return
	 */
	public String navigateToEditNote(){
		JsfUtils.putFolderIntoFlash(currentFolder.get());
		return "/editNote.xhtml";
	}
}
