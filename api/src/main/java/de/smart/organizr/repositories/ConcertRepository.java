package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.Set;

public interface ConcertRepository extends JpaRepository<ConcertHibernateImpl, Integer> {
	@Query("SELECT c from ConcertHibernateImpl c WHERE c.id=:id AND c.creator.userId=:userId")
	Optional<ConcertHibernateImpl> findConcertByIdAndUser(final String id, final String userId);

	@Query("SELECT c from ConcertHibernateImpl c WHERE c.creator.userId=:userId")
	Set<ConcertHibernateImpl> findAllByUser(String userId);

	@Query("SELECT c from ConcertHibernateImpl c WHERE c.creator.userId=:userId ORDER BY c.dueDate DESC")
	Set<ConcertHibernateImpl> findAllByUserSortedDescending(String userId);
}
