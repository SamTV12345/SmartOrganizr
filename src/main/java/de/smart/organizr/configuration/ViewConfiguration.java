package de.smart.organizr.configuration;

import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.view.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

import de.smart.organizr.services.interfaces.UserService;

@Configuration
public class ViewConfiguration {

	@Autowired
	private UserService userService;
	@Autowired
	private FolderService folderService;

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

	@Bean
	@Scope("view")
	public ViewFolderView viewFolderView(){
		return new ViewFolderView(folderService);
	}

	@Bean
	@Scope("view")
	public EditFolderView editFolderView(){
		return new EditFolderView(folderService);
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
