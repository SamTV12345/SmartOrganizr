import {Dropdown} from "../components/form/Dropdown";
import {useEffect, useState} from "react";
import {Folder} from "../models/Folder";
import {apiURL} from "../Keycloak";
import axios from "axios";
import {Page as Paging} from "../models/Page";
import {FolderEmbeddedContainer} from "../models/FolderEmbeddedContainer";
import ReactPDF, {PDFDownloadLink, Page, View, Document, StyleSheet, Image} from '@react-pdf/renderer';
import QRCode from 'react-qr-code'

export const ImportExportView = () => {
    const [selectedFolder, setSelectedFolder] = useState<number>()
    const [loadedFolders, setLoadedFolders] = useState<Paging<FolderEmbeddedContainer<Folder>>>()

    useEffect(() => {
        axios.get(apiURL + "/v1/elements/folders" + "?page=0")
            .then(resp => setLoadedFolders(resp.data))
    }, [])

    const styles = StyleSheet.create({
        page: {
            flexDirection: 'row',
            backgroundColor: '#E4E4E4'
        },
        section: {
            margin: 10,
            padding: 10,
            flexGrow: 1
        }
    });
    const MyDocument = () => {
        return (
            <Document>
                <Page size="A4" style={styles.page}>
                    <View style={styles.section}>
                        {
                            loadedFolders?._embedded.elementRepresentationModelList.map(folder=>{
                                const dataUrl = new XMLSerializer().serializeToString(document.getElementById("folder"+folder.id) as Node)
                                return <Image src={ window.btoa(dataUrl)} />
                            }
                            )
                        }
                    </View>
                </Page>
            </Document>
        )
    }

    return <div className="grid grid-cols-2 p-6">
        <div>
            <h1 className="text-2xl">Import</h1>
            <h2 className="text-xl">Import Data as JSON</h2>
            <h2 className="text-xl">Import Data as CSV</h2>
        </div>
        <div>
            <h1 className="text-2xl">Export</h1>
            <h2 className="text-xl">Export Data as QR-Code</h2>

            <div className="grid grid-cols-2">
                <Dropdown value={selectedFolder} onChange={(e) => setSelectedFolder(Number(e.target.value))}>
                    {loadedFolders && loadedFolders._embedded &&
                        loadedFolders?._embedded.elementRepresentationModelList.map(folder => <option value={folder.id}
                                                                                                      key={folder.id}>{folder.name}</option>)}
                </Dropdown>
                <PDFDownloadLink document={<MyDocument/>} fileName="example.pdf" className="text-center p-2">
                    {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download now!')}
                </PDFDownloadLink>
            </div>

            <div>
                {loadedFolders?._embedded.elementRepresentationModelList.map(folder=><QRCode value={folder.name} id={"folder"+folder.id}/>)}
            </div>
            <h2 className="text-xl">Export Data as JSON</h2>
        </div>
    </div>
}