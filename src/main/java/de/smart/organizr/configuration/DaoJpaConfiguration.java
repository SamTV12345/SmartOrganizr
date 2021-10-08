package de.smart.organizr.configuration;

import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dao.jpa.UserDaoJpaImpl;
import de.smart.organizr.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class DaoJpaConfiguration {

	@Autowired
	private UserRepository userRepository;
	
	@Bean
	public UserDao userDao() {
		return new UserDaoJpaImpl(userRepository);
	}
}
