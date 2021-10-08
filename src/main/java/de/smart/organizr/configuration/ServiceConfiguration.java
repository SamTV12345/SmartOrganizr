package de.smart.organizr.configuration;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.services.implementations.FolderServiceImpl;
import de.smart.organizr.services.interfaces.FolderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

import de.smart.organizr.services.implementations.UserServiceImpl;
import de.smart.organizr.services.interfaces.UserService;

@Configuration
public class ServiceConfiguration {

	@Autowired
	private UserDao userDao;
	@Autowired
	private FolderDao folderDao;
	
	@Bean
	public UserService userService() {
		return new UserServiceImpl(userDao);
	}

	@Bean
	public FolderService folderService(){
		return new FolderServiceImpl(folderDao);
	}
}
