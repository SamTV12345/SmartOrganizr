package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.repositories.FolderRepository;

import java.util.Collection;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

public class FolderDaoJpaImpl implements FolderDao {
	private final FolderRepository folderRepository;

	public FolderDaoJpaImpl(final FolderRepository folderRepository) {
		this.folderRepository = folderRepository;
	}

	@Override
	public Set<Folder> findAllFolders(){
		final Set<Folder> folders = new HashSet<>();
		folderRepository.findAll().forEach(folders::add);
		return folders;
	}

	@Override
	public Folder saveFolder(final Folder folderToBeSaved){
		return folderRepository.save((FolderHibernateImpl) folderToBeSaved);
	}

	@Override
	public Collection<Folder> findAllParentFolders() {
		return folderRepository.findAllParentFolders();
	}
}
