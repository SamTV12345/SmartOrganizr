package de.smart.organizr.security;

import de.smart.organizr.configuration.RootRedirect;
import org.keycloak.adapters.springsecurity.KeycloakConfiguration;
import org.keycloak.adapters.springsecurity.authentication.KeycloakAuthenticationProvider;
import org.keycloak.adapters.springsecurity.config.KeycloakWebSecurityConfigurerAdapter;
import org.keycloak.adapters.springsecurity.filter.KeycloakAuthenticatedActionsFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.mapping.SimpleAuthorityMapper;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter;

@KeycloakConfiguration
class SpringSecurityConfiguration extends KeycloakWebSecurityConfigurerAdapter {

	@Autowired
	public void configureGlobal(
			final AuthenticationManagerBuilder auth) {

		final KeycloakAuthenticationProvider keycloakAuthenticationProvider
				= keycloakAuthenticationProvider();
		keycloakAuthenticationProvider.setGrantedAuthoritiesMapper(
				new SimpleAuthorityMapper());
		auth.authenticationProvider(keycloakAuthenticationProvider);
	}

	@Bean
	@Override
	public SessionAuthenticationStrategy sessionAuthenticationStrategy() {
		return new RegisterSessionAuthenticationStrategy(
				new SessionRegistryImpl());
	}

	@Bean
	public KeycloakAuthenticatedActionsFilter keycloakAuthenticatedActionsFilter() {
		return new KeycloakAuthenticatedActionsFilter();
	}

	@Override
	protected void configure(final HttpSecurity http) throws Exception {
		super.configure(http);
		final String[] staticResources = {
				"/css/**",
				"/images/**",
				"/assets/**",
				"/fonts/**",
				"/scripts/**",
				"/favicon.ico",
				"/ui/**"
		};

		http.addFilterAfter(new RootRedirect(), UsernamePasswordAuthenticationFilter.class)
			.addFilterAfter(new RootRedirect(), UsernamePasswordAuthenticationFilter.class)
		    .addFilterBefore(keycloakPreAuthActionsFilter(), LogoutFilter.class)
		    .addFilterBefore(keycloakAuthenticationProcessingFilter(), BasicAuthenticationFilter.class)
		    .addFilterBefore(keycloakAuthenticatedActionsFilter(), BasicAuthenticationFilter.class)
		    .addFilterAfter(keycloakSecurityContextRequestFilter(), SecurityContextHolderAwareRequestFilter.class)
		    .exceptionHandling().authenticationEntryPoint(authenticationEntryPoint())
		;
		http.csrf().disable().sessionManagement()
				.sessionAuthenticationStrategy(sessionAuthenticationStrategy())
            .and().authorizeRequests()
				.antMatchers("/register*").permitAll()
            .antMatchers(staticResources).permitAll()
		    .antMatchers("**/media/**").permitAll()
		    .antMatchers("/api/public/**").permitAll()
		    .antMatchers("/login*").permitAll()
				                          .antMatchers("/").permitAll()
				                          .antMatchers("/javax.faces.resource/**").permitAll()
				                          .antMatchers("/resetPassword*").permitAll()
				                          .antMatchers("/templates/**").denyAll()
										  .antMatchers("/manageUsers.xhtml").hasRole("admin")
				                          .antMatchers("/**").hasRole("user")
		    .and()
				.logout().logoutUrl("/sso/url")
				.addLogoutHandler(keycloakLogoutHandler());
	}
}