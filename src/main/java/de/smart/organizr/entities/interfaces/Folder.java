package de.smart.organizr.entities.interfaces;

import de.smart.organizr.entities.classes.ElementHibernateImpl;

import javax.persistence.CascadeType;
import javax.persistence.FetchType;
import javax.persistence.OneToMany;
import java.util.List;

public interface Folder extends Element{
	/**
	 * A list of all elements
	 * @return a list of all elements
	 */
	List<Element> getElements();
}
