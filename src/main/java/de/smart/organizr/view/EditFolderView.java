package de.smart.organizr.view;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Optional;

public class EditFolderView {
	private final  FolderService folderService;
	private final UserBean userBean;
	private String description;
	private String name;
	private Folder futureParentFolder;
	private Optional<Folder> optionalSavedFolder;
	private Folder folderToBeSaved;
	private List<Folder> selectableParentFolders;

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
		selectableParentFolders = folderService.findAllFolders(userBean.getUser().getUserId());
		if(folderToBeSaved!=null) {
			removeAllChildFolders(folderToBeSaved,selectableParentFolders);
			selectableParentFolders.remove(folderToBeSaved);
		}
	}

	public void removeAllChildFolders(final Folder currentFolder, final List<Folder> folders){
		for (final Element element : currentFolder.getElements()) {
			if (element instanceof Folder folder) {
				removeAllChildFolders(folder, folders);
				folders.remove(folder);
			}
		}
	}

	public String saveFolder(){
		try {
			saveFolderInFolder();
			return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
		}
		catch (final ElementException exception){
			JsfUtils.putErrorMessage(exception.getLocalizedMessage());
			return null;
		}
	}

	private void saveFolderInFolder() {
		if(folderToBeSaved == null) {
			folderToBeSaved = new FolderHibernateImpl(name, description, userBean.getUser());
		}
		folderToBeSaved.setParent(futureParentFolder);
		folderService.saveFolder(folderToBeSaved);
	}

	public void saveFolderAndCreateAnotherFolder(){
		try {
			saveFolderInFolder();
			setName("");
			setDescription("");
			folderToBeSaved = null;
		}
		catch (final ElementException exception){
			JsfUtils.putErrorMessage(exception.getLocalizedMessage());
		}
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

	public List<Folder> getSelectableParentFolders() {
		return selectableParentFolders;
	}

	public void setSelectableParentFolders(final List<Folder> selectableParentFolders) {
		this.selectableParentFolders = selectableParentFolders;
	}
}
