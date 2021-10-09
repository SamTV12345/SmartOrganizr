package de.smart.organizr.configuration;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dao.jpa.AuthorDaoJpaImpl;
import de.smart.organizr.dao.jpa.FolderDaoJpaImpl;
import de.smart.organizr.dao.jpa.NoteDaoJpaImpl;
import de.smart.organizr.dao.jpa.UserDaoJpaImpl;
import de.smart.organizr.repositories.AuthorRepository;
import de.smart.organizr.repositories.FolderRepository;
import de.smart.organizr.repositories.NoteRepository;
import de.smart.organizr.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DaoJpaConfiguration {

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private FolderRepository folderRepository;
	@Autowired
	private NoteRepository noteRepository;
	@Autowired
	private AuthorRepository authorRepository;
	
	@Bean
	public UserDao userDao() {
		return new UserDaoJpaImpl(userRepository);
	}

	@Bean
	public FolderDao folderDao(){
		return new FolderDaoJpaImpl(folderRepository);
	}

	@Bean
	public NoteDao noteDao(){
		return new NoteDaoJpaImpl(noteRepository);
	}

	@Bean
	public AuthorDao authorDao(){
		return new AuthorDaoJpaImpl(authorRepository);
	}
}
