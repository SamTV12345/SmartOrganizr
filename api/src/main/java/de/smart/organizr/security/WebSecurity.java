package de.smart.organizr.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class WebSecurity {

	@Bean
	@Order(0)
	public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
		final String[] staticResources = {
				"/css/**",
				"/images/**",
				"/assets/**",
				"/fonts/**",
				"/scripts/**",
				"/favicon.ico",
				"/ui/**"
		};
		http.securityMatcher("/api/v1/**")
				.authorizeHttpRequests()
		    .requestMatchers(staticResources).permitAll()
		    .requestMatchers("/**/media/").permitAll()
		    .requestMatchers("/api/public/**").permitAll()
		    .requestMatchers("/login*").permitAll()
		    .requestMatchers("/").permitAll()
				.anyRequest().authenticated()
		    .and()
		    .oauth2ResourceServer()
		    .jwt();
		return http.build();
	}
}