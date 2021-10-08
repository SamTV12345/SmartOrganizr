package de.smart.organizr.configuration;

import de.smart.organizr.dao.interfaces.UserDao;
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
	
	@Bean
	public UserService userService() {
		return new UserServiceImpl(userDao);
	}
}
