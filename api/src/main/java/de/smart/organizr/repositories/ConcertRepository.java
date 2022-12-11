package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ConcertRepository extends JpaRepository<ConcertHibernateImpl, Integer> {
	@Query("SELECT c from ConcertHibernateImpl c WHERE c.id=:id AND c.creator.userId=:userId")
	Optional<ConcertHibernateImpl> findConcertByIdAndUser(final int id, final String userId);
}
