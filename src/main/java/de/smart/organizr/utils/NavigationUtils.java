package de.smart.organizr.utils;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.enums.Version;

public final class NavigationUtils {

	private NavigationUtils() {

	}

	public static String navigateToEditElementView(final Element element) {
		if (element instanceof Folder folder) {
			JsfUtils.putAnotherFolderIntoFlash(folder);
			return "/editFolder";
		}
		else if (element instanceof Note note) {
			JsfUtils.putNoteIntoFlash(note);
			return "/editNote";
		}
		return null;
	}

	public static String navigateToCorrectVersion(final Version version) {
		if (version == Version.OLD_VERSION) {
			return "/viewFoldersView.xhtml";
		}
		else {
			return "/elementsTreeView.xhtml";
		}
	}

	public static String navigateToViewAuthors(){
		return "/viewAuthors.xhtml";
	}

	public static String navigateToEditAuthor(){
		return "/editAuthor.xhtml";
	}
}

