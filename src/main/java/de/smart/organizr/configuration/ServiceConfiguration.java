package de.smart.organizr.configuration;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.services.implementations.FolderServiceImpl;
import de.smart.organizr.services.implementations.NoteServiceImpl;
import de.smart.organizr.services.implementations.PDFServiceImpl;
import de.smart.organizr.services.implementations.UserServiceImpl;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.PDFService;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The ServiceConfiguration autowires the Dao classes and defines the Java configuration for the service classes.
 */
@Configuration
public class ServiceConfiguration {

	@Autowired
	private UserDao userDao;
	@Autowired
	private FolderDao folderDao;
	@Autowired
	private NoteDao noteDao;
	@Autowired
	private AuthorDao authorDao;
	
	@Bean
	public UserService userService() {
		return new UserServiceImpl(userDao);
	}

	@Bean
	public FolderService folderService(){
		return new FolderServiceImpl(folderDao, userDao, noteDao);
	}

	@Bean
	public NoteService noteService(){
		return new NoteServiceImpl(noteDao);
	}


	@Bean
	public PDFService pdfService(){
		return new PDFServiceImpl();
	}
}
