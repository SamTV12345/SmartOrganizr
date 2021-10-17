package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.FolderService;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public class FolderServiceImpl implements FolderService {
	private final FolderDao folderDao;
	private final UserDao userDao;
	private final NoteDao noteDao;

	public FolderServiceImpl(final FolderDao folderDao, final UserDao userDao,
	                         final NoteDao noteDao) {
		this.folderDao = folderDao;
		this.userDao = userDao;
		this.noteDao = noteDao;
	}

	@Override
	public List<Folder> findAllFolders(final int userId){
		final Optional<User> optionalUser = userDao.findUserById(userId);
		if(optionalUser.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		return new ArrayList<>(folderDao.findAllFolders(optionalUser.get()));
	}

	@Override
	public Optional<Folder> findFolderByID(final int folderId){
		return folderDao.findById(folderId);
	}

	@Override
	public Folder saveFolder(final Folder folder){
		return folderDao.saveFolder(folder);
	}

	@Override
	public Collection<Folder> findAllParentFolders(final int userId) {
		return folderDao.findAllParentFolders(userId);
	}

	@Override
	public Optional<Folder> findFolderByUserAndName(final User user, final String s) {
		return folderDao.findFolderByUserAndName(user, s);
	}

	public void recursivelyDeleteElements(final Folder folder){
		for (final Element element: folder.getElements()){
			if(element instanceof Folder folderInFolder){
				recursivelyDeleteElements(folderInFolder);
				folderDao.deleteFolder(folderInFolder);
			}
			else{
				if(element instanceof Note note){
					noteDao.deleteNote(note);
				}
			}
		}
	}

	@Override
	public void deleteFolder(final Folder folder) {
		recursivelyDeleteElements(folder);
		folderDao.deleteFolder(folder);
	}
}
