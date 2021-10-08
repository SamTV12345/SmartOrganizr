package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.services.interfaces.FolderService;

import java.util.Collection;

public class FolderServiceImpl implements FolderService {
	private final FolderDao folderDao;

	public FolderServiceImpl(final FolderDao folderDao) {
		this.folderDao = folderDao;
	}

	@Override
	public Collection<Folder> findAllFolders(){
		return folderDao.findAllFolders();
	}

	@Override
	public Folder saveFolder(final Folder folder){
		return folderDao.saveFolder(folder);
	}
}
