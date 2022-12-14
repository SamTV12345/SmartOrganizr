package de.smart.organizr.entities.classes;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.validators.ElementValidator;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.io.Serial;
import java.io.Serializable;
import java.util.Calendar;
import java.util.Objects;

@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@Table(name = "Elements")
@DiscriminatorColumn(name = "Type", discriminatorType = DiscriminatorType.STRING)
public class ElementHibernateImpl implements Element, Serializable {
	@Serial
	private static final long serialVersionUID = -7407462616923074611L;
	private Calendar creationDate;
	private int id;
	private String name;
	@JsonBackReference
	private Folder parent;
	private String description;
	private User creator;

	public ElementHibernateImpl() {
	}

	protected ElementHibernateImpl(final String name, final Calendar creationDate, final String description,
	                               final User creator) {
		ElementValidator.checkElementId(id);
		ElementValidator.checkElementName(name);
		this.description = description;
		setName(name);
		setCreationDate(creationDate);
		setCreator(creator);
	}

	public ElementHibernateImpl(final int id, final String name, final String description,
	                            final User creator) {
		ElementValidator.checkElementId(id);
		ElementValidator.checkElementName(name);
		this.creationDate = Calendar.getInstance();
		this.id = id;
		this.name = name;
		this.description = description;
		this.creator = creator;
	}

	public ElementHibernateImpl(final Calendar creationDate, final int id, final String name,
	                            final Folder parent, final String description, final User creator) {
		ElementValidator.checkElementId(id);
		ElementValidator.checkElementName(name);
		this.creationDate = creationDate;
		this.id = id;
		this.name = name;
		this.parent = parent;
		this.description = description;
		setCreator(creator);
	}


	@Override
	public boolean equals(final Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		final ElementHibernateImpl that = (ElementHibernateImpl) o;
		return id == that.id && Objects.equals(creationDate, that.creationDate) &&
				Objects.equals(name, that.name) && Objects.equals(parent, that.parent) &&
				Objects.equals(description, that.description);
	}

	@Override
	public int hashCode() {
		return Objects.hash(creationDate, id, name, parent, description);
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
		ElementValidator.checkElementId(id);
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(final String name) {
		ElementValidator.checkElementName(name);
		this.name = name;
	}

	@Override
	@ManyToOne(targetEntity = FolderHibernateImpl.class)
	@JoinColumn(name = "Parent")
	public Folder getParent() {
		return parent;
	}

	@Override
	public void setParent(final Folder parent) {
		this.parent = parent;
	}

	@Override
	public String getDescription() {
		return description;
	}

	@Override
	public void setDescription(final String description) {
		this.description = description;
	}

	@Override
	@ManyToOne(targetEntity = UserHibernateImpl.class)
	@JsonIgnore
	@JoinColumn(name = "user_id_fk")
	public User getCreator() {
		return creator;
	}

	public void setCreator(final User creator) {
		this.creator = creator;
	}

	@Override
	public String toString() {
		return "ElementHibernateImpl{" +
				", id=" + id +
				", name='" + name + '\'' +
				", parent=" + parent +
				", description='" + description + '\'' +
				'}';
	}
}
