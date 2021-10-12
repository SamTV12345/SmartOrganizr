package de.smart.organizr.configuration;

import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.view.*;
import de.smart.organizr.view.converters.AuthorConverter;
import de.smart.organizr.view.converters.FolderConverter;
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
	@Autowired
	private NoteService noteService;
	@Autowired
	private AuthorService authorService;

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
		return servletContext -> servletContext.setInitParameter("primefaces.DOWNLOADER",
				"commons");
	}

	@Bean
	@Scope("view")
	@Autowired
	public ViewFolderView viewFolderView(final UserBean userBean){
		return new ViewFolderView(folderService, userBean);
	}

	@Bean
	@Scope("view")
	@Autowired
	public EditFolderView editFolderView(final UserBean userBean){
		return new EditFolderView(folderService, userBean);
	}
	
	@SuppressWarnings({ "rawtypes", "unchecked" })
	@Bean
	public FilterRegistrationBean FileUploadFilter() {
		final FilterRegistrationBean registration = new FilterRegistrationBean();
		registration.setFilter(new org.primefaces.webapp.filter.FileUploadFilter());
		registration.setName("PrimeFaces FileUpload Filter");
		return registration;
	}

	@Bean
	@Autowired
	@Scope("view")
	public EditNoteView editNoteView(final UserBean userBean){
		return new EditNoteView(noteService, authorService, userBean);
	}

	@Bean
	@Scope("session")
	@Autowired
	public AuthorConverter authorConverter(final UserBean userBean){
		return new AuthorConverter(authorService, userBean);
	}

	@Bean
	@Scope("session")
	@Autowired
	public FolderConverter folderConverter(final UserBean userBean){
		return new FolderConverter(folderService, userBean);
	}

	@Bean
	@Scope("session")
	@Autowired
	public ConverterConfiguration converterConfiguration(final AuthorConverter authorConverter,
	                                                     final FolderConverter folderConverter){
		return new ConverterConfiguration(authorConverter, folderConverter);
	}

	@Bean
	@Scope("view")
	@Autowired
	public EditAuthorView editAuthorView(final UserBean userBean){
		return new EditAuthorView(userBean, authorService);
	}

	@Bean
	@Scope("view")
	public ViewAuthorView viewAuthorView(final UserBean userBean){
		return new ViewAuthorView(authorService, userBean);
	}

	@Bean
	@Scope("request")
	@Autowired
	public ElementsTreeView elementsTreeView(final UserBean userBean){
		return new ElementsTreeView(folderService, noteService, userBean);
	}
}
