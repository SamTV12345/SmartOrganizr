package de.smart.organizr.entities.interfaces;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import java.util.Calendar;

public interface Element {
	Calendar getCreationDate();

	int getId();

	String getName();
}
