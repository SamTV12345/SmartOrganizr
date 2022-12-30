package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.repositories.FolderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

/**
 * The FolderDaoJpaImpl class takes care of every database action related to folders
 */
public class FolderDaoJpaImpl implements FolderDao {
	private final FolderRepository folderRepository;

	public FolderDaoJpaImpl(final FolderRepository folderRepository) {
		this.folderRepository = folderRepository;
	}

	/**
	 * Finds all folders of the creator
	 * @param creator the creator of the folders
	 * @return a set of folder created by the user
	 */
	@Override
	public Set<Folder> findAllFolders(final User creator){
		return folderRepository.findByCreator(creator);

	}

	@Override
	public Page<Folder> findAllFoldersOfUser(final User creator, final Pageable pageable) {
		return folderRepository.findByCreator(creator, pageable);
	}

	/**
	 * Saves/updates a folder
	 * @param folderToBeSaved the folder to be saved/updated
	 * @return the saved/updated folder
	 */
	@Override
	public Folder saveFolder(final Folder folderToBeSaved){
		return folderRepository.save((FolderHibernateImpl) folderToBeSaved);
	}

	/**
	 * Finds all parent folders of the user
	 * @param userId the user whose folders
	 * @return the parent/top level folders
	 */
	@Override
	public Set<Folder> findAllParentFolders(final String userId) {
		return folderRepository.findAllParentFolders(userId);
	}

	/**
	 * Finds a folder by id
	 * @param folderId
	 * @return
	 */
	@Override
	public Optional<Folder> findById(final int folderId) {
		final Optional<FolderHibernateImpl> optionalFolderHibernate = folderRepository.findById(folderId);
		if(optionalFolderHibernate.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalFolderHibernate.get());
	}

	@Override
	public Optional<Element> findByIdAndUsername(final int elementId, final String username) {
		return folderRepository.findElementByIdAndUsername(elementId,username);
	}

	@Override
	public Optional<Folder> findFolderByIdAndUsername(final int folderId, final String username) {
		return folderRepository.findFolderByIdAndUsername(folderId,username);
	}

	@Override
	public Optional<Folder> findFolderByUserAndName(final User user, final String s) {
		return folderRepository.findFolderByUserAndName(user, s);
	}

	@Override
	public void deleteFolder(final Folder folder) {
		folderRepository.deleteFolder(folder.getId());
	}

	@Override
	public Collection<Element> findAllChildren(final String userId, final int number) {
		return folderRepository.findAllChildren(userId, number);
	}

	@Override
	public Page<Folder> findAllFoldersWithName(final String folderName, final User user, final Pageable pageable) {
		return folderRepository.findFolderByNameAndUser(folderName,user.getUserId(),pageable);
	}

	@Override
	public void deleteFolderById(final Folder f) {
		folderRepository.deleteById(f.getId());
	}
}
