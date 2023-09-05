import React, { useState, useEffect } from 'react';
import { fetchWeather } from './api/fetchWeather';
import './App.css';

import ServiceWorkerStorage from 'serviceworker-storage';
import { format } from 'date-fns';
const storage = new ServiceWorkerStorage('podaci', 1);

const App = () => {
    const [query, setQuery] = useState('');
    const [weather, setWeather] = useState({});
    const [datum,setDatum] = useState({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleOnline = () => {
        setIsOnline(true);
    };

    const handleOffline = () => {
        setIsOnline(false);
    };

    const search = async (e) => {
        if(e.key === 'Enter') {
            let data = await fetchWeather(query);
                if(data==null){
                    storage.getItem(query).then(value => {
                        data = value.data;
                        setWeather(data);
                        setDatum(format(value.datum, 'dd. MM. YYY, hh:mm:ss'));
                    });
            }else {
                setWeather(data);
                setDatum("");
                storage.setItem(query,  {"datum": new Date(), "data": data});
            }
            setQuery('');
        }
    }


    return (
        <div className="main-container">
            <input type="text" className="search" placeholder="Traži..." value={query}onChange={(e) => setQuery(e.target.value)}onKeyPress={search}/>
            {weather.main && (
                <div className="city">
                    <h2 className="city-name">
                        <span>{weather.name}</span>
                        <sup>{weather.sys.country}</sup>
                    </h2>
                    <div className="city-temp">
                        {Math.round(weather.main.temp)}
                        <sup>&deg;C</sup>
                    </div>
                    <div className="info">
                        <img className="city-icon" src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt={weather.weather[0].description} />
                        <p>{weather.weather[0].description}</p>
                    </div>
                    <div id="status" className={isOnline ? "online-status" : "offline-status"}>
                    {isOnline ? "ONLINE " : "OFFLINE "}
                    {isOnline ? "" : datum}
                </div>
                </div>
            )}
        </div>
    );
}

export default App;