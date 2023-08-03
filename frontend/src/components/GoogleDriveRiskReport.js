import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { GoogleLogin } from 'react-google-login';
import ReactTable from 'react-table-6';
import 'react-table-6/react-table.css';
import './GoogleDriveRiskReport.css'; // Import your custom CSS file for styling
import {SERVER_URI} from '../config/keys'

const GoogleDriveRiskReport = () => {
  const [token, setToken] = useState(false);
  //let token= localStorage.getItem("token");
  const [profileName, setProfileName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  const [analytics, setAnalytics] = useState({});
  const [files, setFiles] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    if (token) {
      fetchGoogleDriveData();
      fetchProfileInfo();
      //localStorage.setItem('isAuthenticated', true);
    }
  }, [token]);

  const handleGoogleLoginSuccess = async (response) => {
    try {
      window.location.href = `${SERVER_URI}/auth/google`;
    } catch (error) {
      console.error('Failed to link Google Drive:', error);
    }
  };

  const fetchGoogleDriveData = async () => {
    try {
      // Fetch data from the backend
      let accessToken = localStorage.getItem("token");

      const response = await axios.get(`${SERVER_URI}/drive/data`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const { files, analytics } = response.data;
      console.log("response.data", response.data);
      setFiles(files);
      setAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching Google Drive data:', error);
    }
  };

  const fetchProfileInfo = async () => {
    try {
      const accessToken = localStorage.getItem("token");
      if (!accessToken) {
        throw new Error('Access token not found');
      }
  
      const response = await axios.get(`${SERVER_URI}/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      console.log("profileInfo", response.data);
      setProfileName(response.data.name);
      setProfilePicture(response.data.picture);
    } catch (error) {
      console.error('Error fetching profile info:', error);
      // Handle the error here, e.g., clear profile info or show an error message
    }
  };
  

  const handleRevokeAccess = async () => {
    try {
      // Send a request to the backend to revoke Google Drive access
      //await axios.get('http://localhost:5000/auth/revoke');
       setFiles([]);
      setAnalytics({});
      setProfileName('');
      setProfilePicture('');
      localStorage.removeItem("token");
      window.location.reload();
    } catch (error) {
      console.error('Failed to revoke Google Drive access:', error);
    }
  };

  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      style: { fontWeight: 'bold' },
    },
    {
      Header: 'File Type',
      accessor: 'filetype',
    },
  ];

  const handlePageSizeChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
  };

  const handlePageChange = (pageIndex) => {
    setPage(pageIndex);
  };
  
  {/* <GoogleLogin
          clientId='336613732186-o1l28842o1gg746tijesfubpnlohmh4l.apps.googleusercontent.com'
          buttonText="Link Google Drive"
          onSuccess={handleGoogleLoginSuccess}
          onFailure={(error) => console.error('Google Login Failed:', error)}
          uxMode="popup"
        /> */}

  return (
    <div className='parent-div'>
      {!token ? (
        <>
          <a className='link' href= {`${SERVER_URI}/auth/google`}> Link Google Drive </a> 
          {/* <button onClick={handleGoogleLoginSuccess}>Login</button> */}
        </>
       ) : (
        <div >
          <div className="profile-section">
            <img className="profile-picture" src={profilePicture} alt="Profile" />
            <span className="profile-name">{profileName}</span>
            <button className="logout-button" onClick={handleRevokeAccess}>Logout</button>
          </div>
          <h1>Your Google Drive Report</h1>
          {/* <button className="logout-button" onClick={handleRevokeAccess}>Logout</button>
          <button className="fetch-button" onClick={fetchGoogleDriveData}>Fetch Google Drive Data</button> */}
          <div className='table-div'>
            <h3>Analytics</h3>
            <div className="analytics-section">
              <div className="analytics-item">
                <span className="analytics-label">Total Files:</span>
                <span className="analytics-value">{analytics.totalFiles}</span>
              </div>
              <div className="analytics-item">
                <span className="analytics-label">Total Videos:</span>
                <span className="analytics-value">{analytics.totalVideos}</span>
              </div>
              <div className="analytics-item">
                <span className="analytics-label">Total Images:</span>
                <span className="analytics-value">{analytics.totalImages}</span>
              </div>
              <div className="analytics-item">
                <span className="analytics-label">Total Audios:</span>
                <span className="analytics-value">{analytics.totalAudios}</span>
              </div>
              <div className="analytics-item">
                <span className="analytics-label">Total Folders:</span>
                <span className="analytics-value">{analytics.totalFolders}</span>
              </div>
              <div className="analytics-item">
                <span className="analytics-label">Total Storage (MB):</span>
                <span className="analytics-value">{analytics.totalStorage}</span>
              </div>
            </div>
            {files.length > 0 && (
              <div>
                <h3>Files</h3>
                {/* <label>
                  Rows per page:
                  <select value={pageSize} onChange={handlePageSizeChange}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label> */}
                <ReactTable
                  data={files}
                  columns={columns}
                  defaultPageSize={pageSize}
                  className='-striped -highlight'
                  page={page}
                  onPageChange={handlePageChange}
                  style={{ color: 'dark' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveRiskReport;
