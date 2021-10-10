package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.FolderService;

import java.util.Collection;
import java.util.Optional;

public class FolderServiceImpl implements FolderService {
	private final FolderDao folderDao;
	private final UserDao userDao;

	public FolderServiceImpl(final FolderDao folderDao, final UserDao userDao) {
		this.folderDao = folderDao;
		this.userDao = userDao;
	}

	@Override
	public Collection<Folder> findAllFolders(final int userId){
		final Optional<User> optionalUser = userDao.findUserById(userId);
		if(optionalUser.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		return folderDao.findAllFolders(optionalUser.get());
	}

	@Override
	public Folder saveFolder(final Folder folder){
		return folderDao.saveFolder(folder);
	}

	@Override
	public Collection<Folder> findAllParentFolders(final int userId) {
		return folderDao.findAllParentFolders(userId);
	}
}
