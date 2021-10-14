package de.smart.organizr.security;

import java.util.LinkedList;
import java.util.List;
import java.util.Optional;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

public class SmartOrganizrUserDetailsService implements UserDetailsService {

	private final UserService userService;
	private final PasswordEncoder passwordEncoder;
	
	public SmartOrganizrUserDetailsService(final UserService userService, final PasswordEncoder passwordEncoder) {
		this.userService = userService;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public UserDetails loadUserByUsername(final String username) throws UsernameNotFoundException {
		final Optional<User> optionalUser = userService.findUserByUserName(username);
		
		if (optionalUser.isEmpty()) {
			throw new UsernameNotFoundException(username);
		}
		
		final User user = optionalUser.get();
		
		// Rollen lesen
		final List<GrantedAuthority> authorities = new LinkedList<>();
		authorities.add(new SimpleGrantedAuthority(user.getRole().getSpringSecurityAuthority()));
		
		return new org.springframework.security.core.userdetails.User(username, passwordEncoder.encode(user.getPassword()), authorities);
	}

}
