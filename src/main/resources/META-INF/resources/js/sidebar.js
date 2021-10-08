var sidebarCollapsed = false;

function setClasses() {
	
	window.sessionStorage.setItem("sidebarCollapsed", sidebarCollapsed);
	
	if (sidebarCollapsed) {
		$(".sidebar-affected").addClass("sidebar-collapsed");
	} else {
		$(".sidebar-affected").removeClass("sidebar-collapsed");
	}
}

function btnCollapseSidebarClicked() {
	sidebarCollapsed = !sidebarCollapsed;
	setClasses();
	console.log(sidebarCollapsed)
}

/*if (sessionStorage.getItem("sidebarCollapsed") == null) {
	sidebarCollapsed = window.innerWidth < 600; 
} else {
	sidebarCollapsed = window.sessionStorage.getItem("sidebarCollapsed");
}

setClasses();*/
	