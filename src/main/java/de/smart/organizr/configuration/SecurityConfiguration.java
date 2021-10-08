package de.smart.organizr.configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import de.smart.organizr.security.MensaAuthenticationHandler;
import de.smart.organizr.security.MensaUserDetailsService;
import de.smart.organizr.services.interfaces.UserService;

@Configuration
public class SecurityConfiguration {

	@Autowired
	private UserService userService;
	
	@Bean
	public UserDetailsService userDetailsService(final PasswordEncoder passwordEncoder) {
		return new MensaUserDetailsService(userService, passwordEncoder);
	}
	
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
	
	@Bean
	public AuthenticationSuccessHandler authenticationSuccessHandler() {
		return new MensaAuthenticationHandler(userService);
	}
}
