package de.smart.organizr.configuration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

import de.smart.organizr.services.interfaces.UserService;
import de.smart.organizr.view.ChangePasswordView;
import de.smart.organizr.view.EditProfileView;
import de.smart.organizr.view.EditUserView;
import de.smart.organizr.view.ManageUsersView;
import de.smart.organizr.view.RegisterView;
import de.smart.organizr.view.ResetPasswordView;
import de.smart.organizr.view.UserBean;

@Configuration
public class ViewConfiguration {

	@Autowired
	private UserService userService;

	@Bean
	@Scope("session")
	public UserBean userBean() {
		return new UserBean(userService);
	}
	
	@Bean
	@Scope("view")
	public ManageUsersView manageUsersView() {
		return new ManageUsersView(userService);
	}
	
	@Bean
	@Scope("view")
	public EditUserView editUserView() {
		return new EditUserView(userService);
	}

	@Bean
	@Scope("request")
	@Autowired
	public EditProfileView editProfileView(final UserBean userBean){
		return new EditProfileView(userService, userBean);
	}
	
	@Bean
	@Scope("request")
	@Autowired
	public ChangePasswordView changePasswordView(final UserBean userBean) {
		return new ChangePasswordView(userService, userBean);
	}

	@Bean
	@Scope("request")
	public RegisterView registerView(){
		return new RegisterView(userService);
	}

	@Bean
	@Scope("request")
	public ResetPasswordView resetPasswordView(){
		return new ResetPasswordView(userService);
	}

	@Bean
	public ServletContextInitializer initializer() {
		return servletContext -> {
			servletContext.setInitParameter("primefaces.DOWNLOADER",
					"commons");
		};
	}
	
	@SuppressWarnings({ "rawtypes", "unchecked" })
	@Bean
	public FilterRegistrationBean FileUploadFilter() {
		final FilterRegistrationBean registration = new FilterRegistrationBean();
		registration.setFilter(new org.primefaces.webapp.filter.FileUploadFilter());
		registration.setName("PrimeFaces FileUpload Filter");
		return registration;
	}
}
