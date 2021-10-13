package de.smart.organizr.security;

import de.smart.organizr.configuration.ChangePasswordFilter;
import de.smart.organizr.configuration.LoginPageFilter;
import de.smart.organizr.services.interfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@EnableWebSecurity
@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SpringSecurityConfiguration extends WebSecurityConfigurerAdapter {

	@Autowired
	private UserDetailsService userDetailsService;
	@Autowired
	private AuthenticationSuccessHandler authenticationSuccessHandler;
	@Autowired
	private UserService userService;

	@Override
	protected void configure(final AuthenticationManagerBuilder auth) throws Exception {
	    auth.userDetailsService(userDetailsService);
	}
	
	@Override
	protected void configure(final HttpSecurity http) throws Exception {
		
		final String[] adminPages = {
				"/manageDishes.*",
				"/editDish.*"
		};

		final String[] staticResources = {
				"/css/**",
				"/images/**",
				"/assets/**",
				"/fonts/**",
				"/scripts/**",
				"/favicon.ico"
		};
		http.addFilterBefore(new LoginPageFilter(), UsernamePasswordAuthenticationFilter.class);

		http.csrf().disable()   
			.authorizeRequests()
			.antMatchers(staticResources).permitAll()
		    .antMatchers("/register*").permitAll()
		    .antMatchers("**/media/**").permitAll()
		    .antMatchers("/login*").permitAll()
			.antMatchers("/").permitAll()
		    .antMatchers("/javax.faces.resource/**").permitAll()
		    .antMatchers("/resetPassword*").permitAll()
		    .antMatchers("/templates/**").denyAll()
			.antMatchers(adminPages).hasRole("ADMIN")
			.anyRequest()   
            .authenticated()
            .and()
            .formLogin().permitAll()
            .loginPage("/login")
            .defaultSuccessUrl("/menu.xhtml",false)
            .successHandler(authenticationSuccessHandler)
            .and()
            .addFilterAfter(new ChangePasswordFilter(userService),
		            UsernamePasswordAuthenticationFilter.class)
            .httpBasic();
			http.headers()
		    .frameOptions()
		    .sameOrigin()
		    .httpStrictTransportSecurity().disable();
	}
	
}
