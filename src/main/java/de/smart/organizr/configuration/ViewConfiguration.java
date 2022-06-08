package de.smart.organizr.configuration;

import de.smart.organizr.services.interfaces.*;
import de.smart.organizr.view.*;
import de.smart.organizr.view.converters.AuthorConverter;
import de.smart.organizr.view.converters.FolderConverter;
import org.keycloak.adapters.KeycloakConfigResolver;
import org.keycloak.adapters.springboot.KeycloakSpringBootConfigResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.web.context.annotation.SessionScope;

import javax.servlet.ServletContext;

/**
 * The ViewConfiguration autowires the services and defines beans for the view/jsf layer.
 */
@Configuration
public class ViewConfiguration {

	@Autowired
	private UserService userService;
	@Autowired
	private FolderService folderService;
	@Autowired
	private PDFService pdfService;
	@Autowired
	private NoteService noteService;
	@Autowired
	private AuthorService authorService;

	@Bean
	@Scope("session")
	@Autowired
	public UserBean userBean(final ServletContext servletContext) {
		return new UserBean(userService, servletContext);
	}
	
	@Bean
	@Scope("view")
	public ManageUsersView manageUsersView() {
		return new ManageUsersView(userService);
	}

	@Bean
	public KeycloakConfigResolver keycloakConfigResolver() {
		return new KeycloakSpringBootConfigResolver();
	}

	@Bean
	public ServletContextInitializer initializer() {
		return servletContext -> {
			servletContext.setInitParameter("primefaces.UPLOADER",
					"commons");
			servletContext.setInitParameter("primefaces.DOWNLOADER","commons");
			servletContext.setInitParameter("primefaces.THEME", "vela");
		};
	}

	@Bean
	@Scope("session")
	public ThemeBean themeBean(){
		return new ThemeBean();
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
		return new EditNoteView(noteService, authorService, folderService, pdfService, userBean);
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
		return new EditAuthorView(userBean, authorService, noteService, folderService);
	}

	@Bean
	@Scope("view")
	public ViewAuthorView viewAuthorView(final UserBean userBean){
		return new ViewAuthorView(authorService, userBean);
	}

	@Bean
	@Scope("view")
	@Autowired
	public ElementsTreeView elementsTreeView(final UserBean userBean){
		return new ElementsTreeView(folderService, noteService, pdfService, userBean);
	}
}
