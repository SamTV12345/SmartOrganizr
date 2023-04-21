package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dto.DataExporter;
import de.smart.organizr.dto.FolderPatchDto;
import de.smart.organizr.dto.FolderPostDto;
import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.repositories.NoteInConcertRepository;
import de.smart.organizr.services.interfaces.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Component
public class FolderServiceImpl implements FolderService {
	private final FolderDao folderDao;
	private final UserDao userDao;
	private final NoteDao noteDao;
	private final NoteInConcertRepository noteInConcertRepository;
	private final AuthorDao authorDao;

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
	@Transactional
	public Folder saveFolderForUser(final FolderPostDto folder, final String userId) {
		final User user =
				userDao.findUserById(userId).orElseThrow(UserException::createUnknownUserException);
		final Folder newFolder;
		if(folder.getParentId()!=0){
			final Folder parentFolder =
					folderDao.findFolderByIdAndUsername(folder.getParentId(),userId).orElseThrow(
							ElementException::createElementNameMayNotBeEmptyException);
			newFolder =  new FolderHibernateImpl(folder.getName(), parentFolder,folder.getDescription(),user);
		}
		else{
			newFolder =  new FolderHibernateImpl(folder.getName(), Calendar.getInstance(),
					folder.getDescription(),user);
		}

		return folderDao.saveFolder(newFolder);
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
	public Folder findFolderByIdAndUsername(int id, String username) {
		return folderDao.findFolderByIdAndUsername(id,username).orElseThrow(()->
				ElementException.createElementUnknown(id));
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

	@Override
	@Transactional
	public Folder updateFolder(final FolderPatchDto folderPatchDto, final User user) {
		final Folder folder =
				(Folder) folderDao.findByIdAndUsername(folderPatchDto.getFolderId(),user.getUserId()).orElseThrow(ElementException::createElementIdMayNotBeNegative);
		folder.setName(folderPatchDto.getName());
		folder.setDescription(folderPatchDto.getDescription());
		return folder;
	}

	@Override
	public Page<Folder> findAllFoldersWithName(final String folderName, final User user, final Pageable pageable) {
		if(folderName==null){
			return folderDao.findAllFoldersOfUser(user,pageable);
		}
		return folderDao.findAllFoldersWithName(folderName, user, pageable);
	}

	@Override
	@Transactional
	public void deleteElementByIdAndUser(final int elementId, final String userId) {
		final Element elementToDelete =
				folderDao.findByIdAndUsername(elementId,userId).orElseThrow(
						ElementException::createElementNameMayNotBeEmptyException);
		if(elementToDelete instanceof Folder f){
			final Collection<Element> elementsToDelete = folderDao.findAllChildren(userId,elementId);
			//Delete recursively
			elementsToDelete.forEach(element -> {
				if(element instanceof Folder){
					deleteElementByIdAndUser(element.getId(),userId);
				}
				else{
					noteDao.deleteById(element.getId());
				}
			});
			folderDao.deleteFolderById(f);
		}
		else if (elementToDelete instanceof Note n){
			// Delete referenced notes in concert
			noteInConcertRepository.deleteNoteById(n.getId());
			noteDao.deleteById(n.getId());
		}
	}

	@Override
	public DataExporter getOfflineData(final String userId) {
		final User user = userDao.findUserByUserName(userId).orElseThrow(UserException::createUnknownUserException);
		Collection<Folder> folders = folderDao.findAllFolders(user);
		final Collection<Author> authors = authorDao.findAllAuthorsOfUser(user);
		final Collection<Note> notes = noteDao.findAllNotesByUsername(user);
		return new DataExporter(authors,folders, notes);
	}
}
