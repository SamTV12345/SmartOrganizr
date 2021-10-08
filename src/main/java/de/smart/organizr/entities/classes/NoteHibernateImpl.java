package de.smart.organizr.entities.classes;

import de.smart.organizr.entities.interfaces.Note;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import java.io.Serializable;
import java.util.Calendar;

@Entity
@DiscriminatorValue("Note")
public class NoteHibernateImpl extends ElementHibernateImpl implements Note, Serializable {
	private  String name;
	private  String explanation;

	protected NoteHibernateImpl(){
	}

	public NoteHibernateImpl(String name, String explanation, Calendar creationDate) {
		super("Element",creationDate);
		setName(name);
		setExplanation(explanation);
	}

	@Override
	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	@Override
	public String getExplanation() {
		return explanation;
	}

	public void setExplanation(final String explanation) {
		this.explanation = explanation;
	}
}
