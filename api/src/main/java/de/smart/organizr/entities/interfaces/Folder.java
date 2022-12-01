package de.smart.organizr.entities.interfaces;

import java.util.List;

public interface Folder extends Element{
	/**
	 * A list of all elements
	 * @return a list of all elements
	 */
	List<Element> getElements();
}
