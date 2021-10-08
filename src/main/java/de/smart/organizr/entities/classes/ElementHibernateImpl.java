package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import org.hibernate.annotations.Target;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Calendar;

@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@Table(name = "Elements")
@DiscriminatorColumn(name = "Type", discriminatorType = DiscriminatorType.STRING )
public class ElementHibernateImpl implements Element, Serializable {
	private Calendar creationDate;
	private int id;
	private String name;
	private static final String DEFAULT_NAME = "Element";
	private Folder parent;

	public ElementHibernateImpl(){
		this(DEFAULT_NAME, Calendar.getInstance());
	}

	protected ElementHibernateImpl(String name, Calendar creationDate) {
		setName(name);
		setCreationDate(creationDate);
	}

	@Override
	public Calendar getCreationDate() {
		return creationDate;
	}

	public void setCreationDate(final Calendar creationDate) {
		this.creationDate = creationDate;
	}

	@Override
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	@ManyToOne(targetEntity = FolderHibernateImpl.class)
	@JoinColumn(name = "Parent")
	public Folder getParent() {
		return parent;
	}

	public void setParent(final Folder parent) {
		this.parent = parent;
	}
}
