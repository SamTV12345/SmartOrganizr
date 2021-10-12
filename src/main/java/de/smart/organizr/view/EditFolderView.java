package de.smart.organizr.view;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;

import javax.annotation.PostConstruct;
import java.util.Collection;
import java.util.Optional;

public class EditFolderView {
	private final  FolderService folderService;
	private final UserBean userBean;
	private String description;
	private String name;
	private Folder futureParentFolder;
	private Optional<Folder> optionalSavedFolder;
	private Folder folderToBeSaved;

	public EditFolderView(final FolderService folderService, final UserBean userBean) {
		this.folderService = folderService;
		this.userBean = userBean;
	}

	@PostConstruct
	public void initialize() {
		futureParentFolder = JsfUtils.getFolderFromFlash();
		optionalSavedFolder = Optional.ofNullable(JsfUtils.getAnotherFolderFromFlash());
		optionalSavedFolder.ifPresent(folder -> folderToBeSaved = folder);
		optionalSavedFolder.ifPresent(folder -> futureParentFolder = folder.getParent());

	}

	public String saveFolder(){
		if(folderToBeSaved == null) {
			folderToBeSaved = new FolderHibernateImpl(name, description, userBean.getUser());
		}
		folderToBeSaved.setParent(futureParentFolder);
		folderService.saveFolder(folderToBeSaved);
		return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
	}

	public String getDescription() {
		if(optionalSavedFolder.isPresent()){
			return folderToBeSaved.getDescription();
		}
		return description;
	}

	public void setDescription(final String description) {
		if (optionalSavedFolder.isPresent()) {
			this.folderToBeSaved.setDescription(description);
		}
		else {
			this.description = description;
		}
	}

	public String getName() {
		if (optionalSavedFolder.isPresent()) {
			return folderToBeSaved.getName();
		}
		return name;
	}

	public void setName(final String name) {
		if (optionalSavedFolder.isPresent()) {
			this.folderToBeSaved.setName(name);
		}
		else {
			this.name = name;
		}
	}

	public String returnBackToFolderView(){
		return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
	}

	public Folder getFutureParentFolder() {
		return futureParentFolder;
	}

	public void setFutureParentFolder(final Folder folder) {
		futureParentFolder = folder;
	}

	public Collection<Folder> getAllFolders() {
		return folderService.findAllFolders(userBean.getUser().getUserId());
	}
}
