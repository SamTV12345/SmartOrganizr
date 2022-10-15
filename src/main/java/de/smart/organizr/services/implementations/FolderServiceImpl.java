package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.FolderService;
import org.springframework.transaction.annotation.Transactional;

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
	public List<Folder> findAllFolders(final String userId){
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
	public Folder saveFolder(final Folder folder) {
		return folderDao.saveFolder(folder);
	}

	@Override
	public Collection<Folder> findAllParentFolders(final String userId) {
		return folderDao.findAllParentFolders(userId);
	}

	@Override
	public Collection<Element> findChildren(final String userId, final int number) {
		return folderDao.findAllChildren(userId, number);
	}

	@Override
	public Optional<Folder> findFolderByUserAndName(final User user, final String s) {
		return folderDao.findFolderByUserAndName(user, s);
	}

	public void recursivelyDeleteElements(final Folder folder) {
		for (final Element element : folder.getElements()) {
			if (element instanceof Folder folderInFolder) {
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
	@Transactional
	public void moveElementToFolder(int from, int to, String username){
		final Element element =
				folderDao.findByIdAndUsername(from, username).orElseThrow(
						ElementException::createElementNameMayNotBeEmptyException);
		//Remove from old parent
		element.getParent().getElements().removeIf(e->e.getId()==element.getId());

		//Add to new folder
		final Folder toFolder =
				folderDao.findFolderByIdAndUsername(to, username).orElseThrow(
						ElementException::createElementIdMayNotBeNegative);
		toFolder.getElements().add(element);
		element.setParent(toFolder);

	}

	@Override
	public void deleteFolder(final Folder folder) {
		recursivelyDeleteElements(folder);
		folderDao.deleteFolder(folder);
	}
}
