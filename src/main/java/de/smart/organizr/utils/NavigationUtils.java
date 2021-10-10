package de.smart.organizr.utils;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;

public final class NavigationUtils {

	private NavigationUtils(){

	}

	public static String navigateToEditElementView(final Element element){
		if (element instanceof Folder folder) {
			JsfUtils.putFolderIntoFlash(folder);
			return "/editFolder";
		}
		else if (element instanceof Note note){
			JsfUtils.putNoteIntoFlash(note);
			return "/editNote";
		}
		return null;
		}
	}

