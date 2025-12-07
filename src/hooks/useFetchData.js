import { useState, useEffect } from 'react';

// Dữ liệu mô phỏng lịch sử TVL theo ngày (đơn vị: 10^6)
const mockHistoryData = [
    { date: '12/01', tvl: 1, label: 'Tháng 12' },
    { date: '12/07', tvl: 2, label: 'Tuần 1' },
    { date: '12/14', tvl: 2.5, label: 'Tuần 2' },
    { date: '12/21', tvl: 4, label: 'Tuần 3' },
    { date: '12/28', tvl: 6, label: 'Tuần 4' },
    { date: '01/04', tvl: 8, label: 'Tháng 1' },
    { date: '01/11', tvl: 12, label: 'Tuần 6' },
    { date: '01/18', tvl: 20, label: 'Tuần 7' },
];

/**
 * Hook tùy chỉnh để fetch dữ liệu lịch sử TVL.
 * Trong môi trường thực tế, hook này sẽ gọi Subgraph hoặc API.
 */
const useChartData = (timeframe = 'Staked') => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // Mô phỏng việc fetch dữ liệu
        const fetchMockData = () => {
            console.log(`Fetching data for: ${timeframe}`);

            // Giả lập thời gian trễ API 
            setTimeout(() => {
                // Trong thực tế, bạn sẽ xử lý dữ liệu từ API ở đây
                setData(mockHistoryData);
                setIsLoading(false);
            }, 800);
        };

        fetchMockData();
    }, [timeframe]);

    return { data, isLoading };
};

export default useChartData;