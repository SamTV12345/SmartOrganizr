let sidebarCollapsed;

function setClasses() {

	if (sidebarCollapsed) {
		$(".sidebar-affected").addClass("sidebar-collapsed");
	} else {
		$(".sidebar-affected").removeClass("sidebar-collapsed");
	}
}

function btnCollapseSidebarClicked() {
	sidebarCollapsed = !sidebarCollapsed;
	setClasses();
}

function processResize() {

	if (sidebarCollapsed == false) {

		if (window.innerWidth < 768) {
			$(".btn-collapse-sidebar").click();
		}
	}

}

window.onresize = processResize;

function startedUploading(){
	console.log("Starting upload...")
	$(":button").prop('disabled',true)
}
function completedUploading(){
	console.log("Finished upload...")
	$(":button").prop('disabled',false)
}