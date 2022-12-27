package de.smart.organizr.repositories;


import de.smart.organizr.entities.classes.NoteInConcert;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteInConcertRepository extends JpaRepository<NoteInConcert, Integer> {

}
