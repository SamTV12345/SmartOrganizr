package de.smart.organizr.security;

import org.keycloak.adapters.springsecurity.KeycloakConfiguration;
import org.keycloak.adapters.springsecurity.authentication.KeycloakAuthenticationProvider;
import org.keycloak.adapters.springsecurity.config.KeycloakWebSecurityConfigurerAdapter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.mapping.SimpleAuthorityMapper;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@KeycloakConfiguration
class SpringSecurityConfiguration extends KeycloakWebSecurityConfigurerAdapter {

	@Autowired
	public void configureGlobal(
			AuthenticationManagerBuilder auth) {

		KeycloakAuthenticationProvider keycloakAuthenticationProvider
				= keycloakAuthenticationProvider();
		keycloakAuthenticationProvider.setGrantedAuthoritiesMapper(
				new SimpleAuthorityMapper());
		auth.authenticationProvider(keycloakAuthenticationProvider);
	}

	@Bean
	@Override
	protected SessionAuthenticationStrategy sessionAuthenticationStrategy() {
		return new RegisterSessionAuthenticationStrategy(
				new SessionRegistryImpl());
	}

	@Bean
	public FilterRegistrationBean corsFilter() {
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowCredentials(true);
		config.addAllowedOrigin("*");
		config.addAllowedHeader("*");
		config.addAllowedMethod("*");
		source.registerCorsConfiguration("/**", config);

		FilterRegistrationBean bean = new FilterRegistrationBean(new CorsFilter(source));
		bean.setOrder(0);
		return bean;
	}

	@Override
	protected void configure(HttpSecurity http) throws Exception {
		super.configure(http);
		final String[] staticResources = {
				"/css/**",
				"/images/**",
				"/assets/**",
				"/fonts/**",
				"/scripts/**",
				"/favicon.ico"
		};

		http.csrf().disable().authorizeRequests()
				.antMatchers("/register*").permitAll()
            .antMatchers(staticResources).permitAll()
		    .antMatchers("**/media/**").permitAll()
				                          .antMatchers("/login*").permitAll()
				                          .antMatchers("/").permitAll()
				                          .antMatchers("/javax.faces.resource/**").permitAll()
				                          .antMatchers("/resetPassword*").permitAll()
				                          .antMatchers("/templates/**").denyAll()
				                          .antMatchers("/**").hasRole("user");
	}
}